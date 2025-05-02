import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { DebugUserSelect } from "../../components/DebugUserSelect";

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const { mutate: login } = useLogin<LoginFormValues>();
  const [loading, setLoading] = useState(false);

  const handleUserSelect = ({ email, password }: LoginFormValues) => {
    form.setFieldsValue({ email, password });
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          ログイン
        </Title>
        <DebugUserSelect onUserSelect={handleUserSelect} />
        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="メールアドレス"
            rules={[
              { required: true, message: "メールアドレスを入力してください" },
              { type: "email", message: "有効なメールアドレスを入力してください" },
            ]}
          >
            <Input size="large" placeholder="example@kater.jp" />
          </Form.Item>
          <Form.Item
            name="password"
            label="パスワード"
            rules={[{ required: true, message: "パスワードを入力してください" }]}
          >
            <Input.Password size="large" placeholder="パスワード" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              block
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}; 